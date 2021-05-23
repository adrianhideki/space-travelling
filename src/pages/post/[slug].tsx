import { GetStaticPaths, GetStaticProps } from 'next';
import { FiCalendar, FiUser, FiClock } from 'react-icons/fi';
import Head from 'next/head';
import Prismic from '@prismicio/client';
import { useRouter } from 'next/router';
import { RichText } from 'prismic-dom';

import format from 'date-fns/format';
import ptBR from 'date-fns/locale/pt-BR';
import { getPrismicClient } from '../../services/prismic';

import commonStyles from '../../styles/common.module.scss';
import styles from './post.module.scss';

interface Post {
  first_publication_date: string | null;
  data: {
    title: string;
    banner: {
      url: string;
    };
    author: string;
    content: {
      heading: string;
      body: {
        text: string;
      }[];
    }[];
  };
}

interface PostProps {
  post: Post;
}

export default function Post({ post }: PostProps): React.ReactElement {
  const router = useRouter();
  const content = post.data.content.map(postContent => ({
    htmlContent:
      RichText.asHtml(postContent.heading) + RichText.asHtml(postContent.body),
    textContent:
      RichText.asText(postContent.heading) + RichText.asText(postContent.body),
    key: RichText.asText(postContent.heading).replace(' ', '-'),
  }));

  const timeToRead = 1;

  if (router.isFallback) {
    return <div>Loading...</div>;
  }

  return (
    <>
      <Head>
        <title>{post.data.title} </title>
      </Head>
      {post.data.banner && (
        <img
          className={styles.banner}
          src={post.data.banner.url}
          alt="banner"
        />
      )}
      <main className={styles.container}>
        <h1>{post.data.title}</h1>
        <div className={styles.icons}>
          <time className={commonStyles.iconText}>
            <FiCalendar />
            {post.first_publication_date}
          </time>
          <span className={commonStyles.iconText}>
            <FiUser />
            {post.data.author}
          </span>
          <span className={commonStyles.iconText}>
            <FiClock />
            {timeToRead} min
          </span>
        </div>
        <div className={styles.content}>
          {content.map(postContent => (
            <div
              key={postContent.key}
              className={styles.post}
              dangerouslySetInnerHTML={{ __html: postContent.htmlContent }}
            />
          ))}
        </div>
      </main>
    </>
  );
}

export const getStaticPaths: GetStaticPaths = async () => {
  const prismic = getPrismicClient();

  const posts = await prismic.query(
    [Prismic.predicates.at('document.type', 'post')],
    {
      pageSize: 4,
    }
  );

  const slugs = posts.results.map(post => ({ params: { slug: post.uid } }));

  return {
    paths: slugs,
    fallback: true,
  };

  // TODO
};

export const getStaticProps: GetStaticProps = async context => {
  const prismic = getPrismicClient();
  const { slug } = context.params;

  const response = await prismic.getByUID('post', String(slug), {});

  const post = {
    first_publication_date: format(
      new Date(response.first_publication_date),
      'dd MMM yyyy',
      {
        locale: ptBR,
      }
    ),
    data: {
      title: response.data.title,
      banner: {
        url: response.data.banner.url,
      },
      author: response.data.author,
      content: response.data.content,
    },
  };

  return {
    props: {
      post,
    },
    revalidate: 60 * 30, // 30 minutes
  };
};
