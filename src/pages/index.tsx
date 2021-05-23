import Prismic from '@prismicio/client';
import { GetStaticProps } from 'next';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import styles from './home.module.scss';
import commonStyles from '../styles/common.module.scss';
import { getPrismicClient } from '../services/prismic';

interface Post {
  uid?: string;
  first_publication_date: string | null;
  data: {
    title: string;
    subtitle: string;
    author: string;
  };
}

interface PostPagination {
  next_page: string;
  results: Post[];
}

interface HomeProps {
  postsPagination: PostPagination;
}

export default function Home({
  postsPagination,
}: HomeProps): React.ReactElement {
  return <>Hellow</>;
}

export const getStaticProps: GetStaticProps = async () => {
  const prismic = getPrismicClient();
  const postsResponse = await prismic.query(
    [Prismic.predicates.at('document.type', 'post')],
    {
      fetch: ['post.title', 'post.subtitle', 'post.author'],
      pageSize: 20,
      // page: 1,
    }
  );

  const posts = postsResponse.results.map(p => ({
    uid: p.uid,
    first_publication_date: format(
      new Date(p.first_publication_date),
      'dd MMM yyyy',
      {
        locale: ptBR,
      }
    ),
    data: {
      title: p.data.title,
      subtitle: p.data.subtitle,
      author: p.data.author,
    },
  }));

  console.log(postsResponse);

  return {
    props: {
      next_page: postsResponse.next_page,
      results: posts,
    },
  };
};
